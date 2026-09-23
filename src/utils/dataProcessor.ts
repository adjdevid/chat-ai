import Papa from 'papaparse';
import { ColumnMeta, Dataset } from '../types';

export function parseCSVFile(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          reject(new Error('File kosong atau format CSV tidak valid.'));
          return;
        }

        const data = results.data as Record<string, any>[];
        const columns = extractColumnMetadata(data);
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        const sizeFormatted = `${(file.size / 1024).toFixed(1)} KB`;

        const dataset: Dataset = {
          id: `dataset-upload-${Date.now()}`,
          name: fileName || 'Uploaded Dataset',
          description: `Dataset CSV diunggah: ${file.name} (${data.length} baris, ${columns.length} kolom)`,
          category: 'custom',
          rowCount: data.length,
          columns,
          data,
          createdAt: new Date().toISOString().split('T')[0],
          fileSizeFormatted: sizeFormatted,
        };

        resolve(dataset);
      },
      error: (err) => {
        reject(err);
      },
    });
  });
}

export function parseRawJSON(jsonString: string, name = 'Custom JSON Dataset'): Dataset {
  const parsed = JSON.parse(jsonString);
  let data: Record<string, any>[] = [];

  if (Array.isArray(parsed)) {
    data = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    // If wrapped in an object with a list property
    const arrayKey = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
    if (arrayKey) {
      data = parsed[arrayKey];
    } else {
      data = [parsed];
    }
  }

  if (data.length === 0) {
    throw new Error('Data JSON tidak memuat array data yang valid.');
  }

  const columns = extractColumnMetadata(data);
  return {
    id: `dataset-json-${Date.now()}`,
    name,
    description: `Dataset JSON kustom (${data.length} baris, ${columns.length} kolom)`,
    category: 'custom',
    rowCount: data.length,
    columns,
    data,
    createdAt: new Date().toISOString().split('T')[0],
    fileSizeFormatted: `${(new Blob([jsonString]).size / 1024).toFixed(1)} KB`,
  };
}

export function extractColumnMetadata(data: Record<string, any>[]): ColumnMeta[] {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);

  return keys.map((key) => {
    const values = data.map((d) => d[key]);
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== '');
    const isNum = nonNullValues.length > 0 && nonNullValues.every((v) => !isNaN(Number(v)));
    const isDate =
      !isNum &&
      nonNullValues.length > 0 &&
      nonNullValues.every((v) => !isNaN(Date.parse(String(v))) && isNaN(Number(v)));

    const type: 'number' | 'string' | 'date' | 'boolean' = isNum
      ? 'number'
      : isDate
      ? 'date'
      : typeof nonNullValues[0] === 'boolean'
      ? 'boolean'
      : 'string';

    const uniqueCount = new Set(values).size;

    let stats: ColumnMeta['stats'] = {};
    if (type === 'number') {
      const numVals = nonNullValues.map(Number);
      const min = Math.min(...numVals);
      const max = Math.max(...numVals);
      const sum = numVals.reduce((a, b) => a + b, 0);
      const mean = Math.round((sum / numVals.length) * 100) / 100;
      const sorted = [...numVals].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      stats = { min, max, sum, mean, median };
    } else {
      const counts: Record<string, number> = {};
      nonNullValues.forEach((v) => {
        const s = String(v);
        counts[s] = (counts[s] || 0) + 1;
      });
      const topCategories = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }));
      stats = { topCategories };
    }

    return {
      name: key,
      type,
      sampleValues: values.slice(0, 5),
      nullCount: values.length - nonNullValues.length,
      uniqueCount,
      stats,
    };
  });
}

/**
 * Builds a compact summary of the dataset for the LLM system context prompt
 */
export function buildDatasetContextSummary(dataset: Dataset): string {
  const metaLines = dataset.columns.map((col) => {
    if (col.type === 'number' && col.stats) {
      return ` - [${col.name}] (numeric): Min=${col.stats.min}, Max=${col.stats.max}, Mean=${col.stats.mean}, Median=${col.stats.median}, Sum=${col.stats.sum}`;
    }
    if (col.stats?.topCategories && col.stats.topCategories.length > 0) {
      const topStr = col.stats.topCategories.map((t) => `${t.value} (${t.count})`).join(', ');
      return ` - [${col.name}] (${col.type}): ${col.uniqueCount} unik. Top: ${topStr}`;
    }
    return ` - [${col.name}] (${col.type}): sample=${col.sampleValues.slice(0, 3).join(', ')}`;
  });

  const sampleRows = dataset.data.slice(0, 10);

  return `Nama Dataset: ${dataset.name}
Total Baris: ${dataset.rowCount}
Struktur Kolom & Statistik:
${metaLines.join('\n')}

Sampel Baris Awal (JSON):
${JSON.stringify(sampleRows, null, 2)}`;
}

/**
 * Export data to CSV file download
 */
export function exportToCSV(dataset: Dataset, filename?: string) {
  const csv = Papa.unparse(dataset.data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename || dataset.name.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to JSON file download
 */
export function exportToJSON(dataset: Dataset, filename?: string) {
  const jsonStr = JSON.stringify(dataset.data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename || dataset.name.replace(/\s+/g, '_')}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase';
import { ChatSession } from '../types';

/**
 * Save or update a single chat session in Firestore for a logged-in user
 */
export async function saveSessionToFirestore(userId: string, session: ChatSession): Promise<void> {
  if (!userId || !session || !session.id) return;
  const path = `users/${userId}/sessions/${session.id}`;
  try {
    const payload = {
      id: session.id,
      userId,
      title: session.title || 'Percakapan AI',
      mode: session.mode || 'general',
      activeDatasetId: session.activeDatasetId || '',
      messages: session.messages || [],
      isPinned: !!session.isPinned,
      createdAt: session.createdAt || new Date().toISOString(),
      updatedAt: session.updatedAt || Date.now(),
    };
    await setDoc(doc(db, 'users', userId, 'sessions', session.id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a session from Firestore for a logged-in user
 */
export async function deleteSessionFromFirestore(userId: string, sessionId: string): Promise<void> {
  if (!userId || !sessionId) return;
  const path = `users/${userId}/sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'sessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe in real time to user chat sessions from Firestore
 */
export function subscribeUserSessions(
  userId: string,
  onSessionsUpdate: (sessions: ChatSession[]) => void
): () => void {
  const path = `users/${userId}/sessions`;
  const collectionRef = collection(db, 'users', userId, 'sessions');

  const unsubscribe = onSnapshot(
    collectionRef,
    (snapshot) => {
      const remoteSessions: ChatSession[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        remoteSessions.push({
          id: docSnap.id,
          title: data.title || 'Percakapan AI',
          messages: Array.isArray(data.messages) ? data.messages : [],
          activeDatasetId: data.activeDatasetId || 'dataset-finance-q3',
          mode: data.mode || 'general',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
          isPinned: !!data.isPinned,
        });
      });

      remoteSessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      onSessionsUpdate(remoteSessions);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );

  return unsubscribe;
}

/**
 * Sync offline / local guest sessions to Firestore upon user log in
 */
export async function syncLocalSessionsToFirestore(userId: string, localSessions: ChatSession[]): Promise<void> {
  if (!userId || !localSessions || localSessions.length === 0) return;

  const path = `users/${userId}/sessions`;
  try {
    // Fetch current remote docs to avoid overwriting newer ones unnecessarily
    const existingSnap = await getDocs(collection(db, 'users', userId, 'sessions'));
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));

    for (const session of localSessions) {
      // Only upload if session has messages or is not already in Firestore
      if (session.messages.length > 0 || !existingIds.has(session.id)) {
        await saveSessionToFirestore(userId, session);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

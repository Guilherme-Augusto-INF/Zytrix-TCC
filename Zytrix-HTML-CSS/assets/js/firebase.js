import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, writeBatch,
  runTransaction, increment, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyDLUogDD_G98mDO7SqEA_U6JX1HlRuseUE',
  authDomain: 'zytrix-ca4f2.firebaseapp.com',
  projectId: 'zytrix-ca4f2',
  storageBucket: 'zytrix-ca4f2.firebasestorage.app',
  messagingSenderId: '538535719632',
  appId: '1:538535719632:web:b8a5de998ca8d1db00a4d5',
  measurementId: 'G-422Y8YEZYX'
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = 'pt-BR';
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export {
  onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendEmailVerification,
  sendPasswordResetEmail, signOut, collection, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot,
  serverTimestamp, writeBatch, runTransaction, increment, Timestamp
};

export async function ensureWallet(uid) {
  if (!uid) throw new Error('UID ausente');
  const ref = doc(db, 'wallets', uid);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, {
        uid, balance: 500, totalSent: 0, totalReceived: 0,
        lastTransactionId: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
    }
  });
  return ref;
}

export async function getProfile(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'profiles', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function isAdminUid(uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists() && snap.data().active === true;
  } catch {
    return false;
  }
}

export function normalize(text='') {
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function mainCategory(categoryId='') {
  return String(categoryId).split(' - ')[0].trim();
}

export function selectStream(live) {
  localStorage.setItem('zytrixSelectedStream', live.id);
  localStorage.setItem('zytrixSelectedStreamName', live.username || 'Streamer');
  localStorage.setItem('zytrixSelectedStreamTitle', live.title || 'Transmissão');
}

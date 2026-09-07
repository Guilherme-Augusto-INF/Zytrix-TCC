import { auth, signOut } from './firebase.js';signOut(auth).finally(()=>location.replace('index.html'));

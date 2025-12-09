// src/firebase.js
import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore"; // ★ 중요!

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};
console.log("내 프로젝트 ID:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);

// ★ 방화벽이 있는 환경(회사 등)에서 연결을 유지하는 설정
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, 
});

export { db };
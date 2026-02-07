// js/config/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// TU CONFIGURACIÓN (MANTÉN TUS CLAVES AQUÍ)
const firebaseConfig = {
  apiKey: "AIzaSyAb2eKlXxyn9S6hbvMx5bWjqggv12T7JJ0",
  authDomain: "gestion-discos.firebaseapp.com",
  projectId: "gestion-discos",
  storageBucket: "gestion-discos.firebasestorage.app",
  messagingSenderId: "424967091025",
  appId: "1:424967091025:web:620e4a86c732921d8f9970"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
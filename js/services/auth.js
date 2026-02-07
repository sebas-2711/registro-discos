// js/services/auth.js
import { auth, provider } from "../config/firebase-config.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. Iniciar sesión (Abre la ventanita de Google)
export const loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
        // No necesitamos devolver nada, el "observador" detectará el cambio
    } catch (error) {
        console.error("Error Login:", error);
        alert("No se pudo iniciar sesión: " + error.message);
    }
};

// 2. Cerrar sesión
export const logout = async () => {
    try {
        await signOut(auth);
        window.location.reload(); // Recargamos la página para limpiar la memoria
    } catch (error) {
        console.error("Error Logout:", error);
    }
};

// 3. El "Vigilante" (Observer)
// Esta función avisa automáticamente cuando el usuario entra o sale
export const subscribeToAuth = (callback) => {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
};
// js/services/inventory.js
import { db } from "../config/firebase-config.js";
import { 
    collection, addDoc, doc, deleteDoc, updateDoc, onSnapshot, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const COLLECTION_NAME = "discos";

// 1. Escuchar cambios en tiempo real (Read)
export const subscribeToInventory = (callback) => {
    const q = query(collection(db, COLLECTION_NAME), orderBy("fechaCompra", "desc"));
    return onSnapshot(q, (snapshot) => {
        const disks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(disks);
    });
};

// 2. Añadir nuevo disco (Create)
export const addDisk = async (diskData) => {
    try {
        await addDoc(collection(db, COLLECTION_NAME), diskData);
        return { success: true };
    } catch (error) {
        console.error("Error al añadir:", error);
        return { success: false, error };
    }
};

// 3. Eliminar disco (Delete)
export const deleteDisk = async (id) => {
    const confirm = window.confirm("¿Estás seguro de eliminar este disco? Esta acción no se puede deshacer.");
    if (confirm) {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    }
};

// 4. Actualizar disco (Update)
export const updateDisk = async (id, newData) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, newData);
        return { success: true };
    } catch (error) {
        console.error("Error al actualizar:", error);
        return { success: false, error };
    }
};
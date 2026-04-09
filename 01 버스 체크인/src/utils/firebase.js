import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAuXJ3E1Lv1hfFEkMhY4MBxmNqyEphprdY",
  authDomain: "wedding-bus.firebaseapp.com",
  databaseURL: "https://wedding-bus-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wedding-bus",
  storageBucket: "wedding-bus.firebasestorage.app",
  messagingSenderId: "2295585810",
  appId: "1:2295585810:web:77ea5192e9a2d427834ccb",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

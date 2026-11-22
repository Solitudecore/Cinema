// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  Auth,
  // @ts-ignore
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDnE7zmP5sBmZsGrx6A4lg0A1ZxfMuePQM",
  authDomain: "cineverse-d3a0f.firebaseapp.com",
  projectId: "cineverse-d3a0f",
  storageBucket: "cineverse-d3a0f.firebasestorage.app",
  messagingSenderId: "809266383831",
  appId: "1:809266383831:web:d472fe0628a5975294d992",
  measurementId: "G-85EM0DSQNV",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { app, auth };
export default auth;

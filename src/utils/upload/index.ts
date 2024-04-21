import { initializeApp } from "firebase/app"
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage"
import { sha256hash } from "../crypto";

export const AUTHORIZED_FILE_TYPES = ['image/png', 'image/jpg', 'image/jpeg']
export const MAX_FILE_SIZE = 500_000

const firebaseConfig = {
  apiKey: process.env.FIREBASE_APIKEY,
  authDomain: process.env.FIREBASE_AUTHDOMAIN,
  projectId: process.env.FIREBASE_PROJECTID,
  storageBucket: process.env.FIREBASE_STORAGEBUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGINGSENDERID,
  appId: process.env.FIREBASE_APPID,
  measurementId: process.env.FIREBASE_MEASUREMENTID,
};

// Initialize Firebase and cloud storage
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const uploadImageToFirebase = async (image: File): Promise<{ success: boolean, error?: string, url?: string }> => {
  const extension = image.name.split('.').pop()
  if (!AUTHORIZED_FILE_TYPES.includes(image.type)) {
    return { success: false, error: "unauthorized file type." }
  }
  if (image.size > MAX_FILE_SIZE) {
    return { success: false, error: "file is too big." }
  }
  const storageRef = ref(storage, `${sha256hash(image.name)}.${extension}`);
  const snapshot = await uploadBytes(storageRef, await image.arrayBuffer());
  return { success: true, url: await getDownloadURL(snapshot.ref) };
}

export { app, storage, uploadImageToFirebase }
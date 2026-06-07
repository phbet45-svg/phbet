import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function check() {
  const d = await getDoc(doc(db, "system_config", "general"));
  console.log("Exists:", d.exists());
  if (d.exists()) {
    console.log("Config Data:", JSON.stringify(d.data(), null, 2));
  }
}
check();

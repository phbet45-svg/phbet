import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function resetAll() {
  console.log("Starting script reset...");

  try {
    const matchesRef = collection(db, "matches");
    const matchesSnap = await getDocs(matchesRef);
    console.log(`Found ${matchesSnap.size} matches to delete`);
    let batch = writeBatch(db);
    for (const doc of matchesSnap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    console.log("Matches deleted.");
  } catch (e) {
    console.error("Error deleting matches:", e);
  }

  try {
    const betsRef = collection(db, "bets");
    const betsSnap = await getDocs(betsRef);
    console.log(`Found ${betsSnap.size} bets to delete`);
    let batch = writeBatch(db);
    for (const doc of betsSnap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    console.log("Bets deleted.");
  } catch(e) {
    console.error("Error deleting bets:", e);
  }

  console.log("Script reset complete!");
  process.exit(0);
}

resetAll();

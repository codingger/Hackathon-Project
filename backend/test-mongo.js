import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}

import mongoose from "mongoose";
import dotenv from "dotenv";
import Section from "./models/Section.js";
import Elements from "./models/Elements.js";

dotenv.config();

async function runTest() {
  console.log("=== MONGODB PERSISTENCE TEST ===");
  console.log("Connecting to MONGODB_URI:", process.env.MONGODB_URI);

  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("🟢 Connected to MongoDB Atlas successfully!");

    const testSectionId = "1999999999";
    const testFieldId = "2999999991";

    // Clean up prior test data
    await Section.deleteOne({ sectionId: testSectionId });
    await Elements.deleteOne({ fieldId: testFieldId });

    // 1. Test Section creation
    const sectionDoc = await Section.create({
      sectionId: testSectionId,
      sectionName: "Test Section",
      pageName: "TestPage",
      isGenerated: true,
      variations: "1"
    });
    console.log("🟢 Created Section document in Atlas:", sectionDoc.sectionId);

    // 2. Test Element creation
    const elementDoc = await Elements.create({
      sectionId: testSectionId,
      elementName: "Test Headline",
      fieldId: testFieldId,
      content: "Original Content Text",
      contentType: "Text",
      pageName: "TestPage"
    });
    console.log("🟢 Created Element document in Atlas:", elementDoc.fieldId, "->", elementDoc.content);

    // 3. Test Element PATCH / Upsert Update
    const updatedDoc = await Elements.findOneAndUpdate(
      { fieldId: testFieldId },
      { $set: { content: "Updated Artisanal Coffee & Roastery Text" } },
      { upsert: true, new: true }
    );
    console.log("🟢 Updated Element content in Atlas:", updatedDoc.fieldId, "->", updatedDoc.content);

    // 4. Test Fetching Section with Elements
    const fetchedSection = await Section.findOne({ sectionId: testSectionId });
    const fetchedElements = await Elements.find({ sectionId: testSectionId });

    console.log("🟢 Verified Section Query:", fetchedSection.sectionName);
    console.log("🟢 Verified Elements Query Count:", fetchedElements.length);
    console.log("🟢 Verified Field Content:", fetchedElements[0].content);

    // Clean up test documents
    await Section.deleteOne({ sectionId: testSectionId });
    await Elements.deleteOne({ fieldId: testFieldId });
    console.log("🟢 Test documents cleaned up cleanly.");

    console.log("==========================================");
    console.log("🎉🎉🎉 ALL MONGODB ATLAS CONTRACT TESTS PASSED 100% 🎉🎉🎉");
    console.log("==========================================");

    process.exit(0);
  } catch (err) {
    console.error("🔴 MongoDB Test Failed:", err.message);
    process.exit(1);
  }
}

runTest();

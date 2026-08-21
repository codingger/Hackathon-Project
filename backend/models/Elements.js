import mongoose from "mongoose";

const elementSchema = new mongoose.Schema({
  sectionId: { type: String, required: true },
  elementName: { type: String, required: true },
  fieldId: { type: String, required: true, unique: true },
  content: { type: String, default: '' },
  contentType: { type: String, enum: ['Image', 'Text', 'Textfield', 'Button', 'Cards'], required: true },
  pageName: { type: String, default: 'Home' },
  css: { type: String, default: null },
  loop: { type: Array, default: [] },
}, { timestamps: true });

export default mongoose.model('Element', elementSchema);
import mongoose from 'mongoose'

const aboutContentSchema = new mongoose.Schema({
  pageTitle: { type: String, trim: true, default: 'About CAD Tech Solution' },
  tagline: { type: String, trim: true, default: 'Learn. Design. Innovate.' },
  intro: {
    type: String, trim: true, default: 'CAD Tech Solution is a mechanical CAD design and engineering resource established in 2020 by Arvind Nagpure. We focus on practical mechanical design, 3D CAD modelling, engineering drawings, and digital design resources that help engineers, students, designers, and businesses bring ideas to life.\nOur approach goes beyond creating models that look good on screen. We emphasize design accuracy, clear documentation, and Design for Manufacturability (DFM), helping clients prepare designs for applications such as CNC machining, fabrication, and 3D printing.'
  },
  mission: { type: String, trim: true, default: 'To make mechanical design resources and CAD solutions more accessible while encouraging engineering creativity, practical learning, and innovation.' },
  vision: { type: String, trim: true, default: 'To support a global community of engineers, learners, designers, and manufacturers through reliable CAD resources, practical design solutions, and a commitment to quality.' },
  supportAreas: { type: [String], default: ['CAD models', 'engineering services', 'professional training'] },
  values: { type: [String], default: ['Practical learning', 'Accessible resources', 'Quality design'] },
  finalCta: { type: String, trim: true, default: 'Ready to start your CAD journey?' },
  isPublished: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true, versionKey: false })

export const AboutContent = mongoose.models.AboutContent || mongoose.model('AboutContent', aboutContentSchema)
export default AboutContent

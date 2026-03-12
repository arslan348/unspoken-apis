const mongoose = require('mongoose');

const aboutSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'About Us',
    },
    subtitle: {
      type: String,
      default: 'What sets Unspoken Flame apart is our philosophy: fire as a witness.',
    },
    visionTitle: {
      type: String,
      default: 'Our Vision',
    },
    visionText: {
      type: String,
      default: 'We believe in living gently, in slowing down and finding beauty in quiet moments. Our vision is to create candles that feel rooted in nature and grounded in calm, bringing warmth and stillness into everyday life. Inspired by earth, air, and light, our candles are made to nurture a sense of balance. They are meant to hold space, for rest, reflection, and moments when you simply want to feel present in your surroundings.',
    },
    visionImage: {
      type: String,
      default: 'https://images.pexels.com/photos/5854426/pexels-photo-5854426.jpeg?cs=srgb&dl=pexels-peg1997-5854426.jpg&fm=jpg',
    },
    approachTitle: {
      type: String,
      default: 'Our Approach',
    },
    approachText: {
      type: String,
      default: 'Our approach is simple, mindful, and intentional. We work closely with natural-feeling materials and carefully selected fragrances that feel soft, clean, and comforting rather than overpowering. We let nature guide our choices. By keeping our designs minimal and our methods thoughtful, we allow each candle to express its own quiet character, a subtle glow, a familiar warmth, a scent that settles gently into the space.',
    },
    approachImage: {
      type: String,
      default: 'https://images.pexels.com/photos/5499310/pexels-photo-5499310.jpeg?cs=srgb&dl=pexels-anntarazevich-5499310.jpg&fm=jpg',
    },
    processTitle: {
      type: String,
      default: 'Our Process',
    },
    processText: {
      type: String,
      default: 'Each candle is hand-poured in small batches, allowing us to remain connected to every step of the process. We take our time testing, adjusting, and refining, ensuring an even burn, a balanced scent, and a calm experience from start to finish. Our process is slow by intention. It\'s shaped by patience, care, and respect for the craft. Because when something is made with presence and purpose, it carries that feeling into the homes and moments it becomes part of.',
    },
    processImage: {
      type: String,
      default: 'https://images.pexels.com/photos/7310146/pexels-photo-7310146.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1200Pexels',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('About', aboutSchema);
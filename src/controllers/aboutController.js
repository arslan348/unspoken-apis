const About = require('../models/About');

// Get about data
exports.getAbout = async (req, res) => {
  try {
    let about = await About.findOne();
    if (!about) {
      // Create default if not exists
      about = await About.create({});
    }
    res.status(200).json({
      success: true,
      data: about,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update about data
exports.updateAbout = async (req, res) => {
  try {
    const { title, subtitle, visionTitle, visionText, visionImage, approachTitle, approachText, approachImage, processTitle, processText, processImage } = req.body;

    let about = await About.findOne();
    if (!about) {
      about = new About();
    }

    about.title = title || about.title;
    about.subtitle = subtitle || about.subtitle;
    about.visionTitle = visionTitle || about.visionTitle;
    about.visionText = visionText || about.visionText;
    about.visionImage = visionImage || about.visionImage;
    about.approachTitle = approachTitle || about.approachTitle;
    about.approachText = approachText || about.approachText;
    about.approachImage = approachImage || about.approachImage;
    about.processTitle = processTitle || about.processTitle;
    about.processText = processText || about.processText;
    about.processImage = processImage || about.processImage;

    await about.save();

    res.status(200).json({
      success: true,
      data: about,
      message: 'About section updated successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
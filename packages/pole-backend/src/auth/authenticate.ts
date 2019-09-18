const router = require('express').Router();
const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { registerValidation, loginValidation } from '../Validation';
import { Request, Response } from 'express';

router.post('/register', async (req: Request, res: Response) => {
  // LETS VALIDATE BEFORE WE MAKE A USER
  const { error } = registerValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const emailExists = await User.findOne({ email: req.body.email });
  if (emailExists) return res.status(400).send('Email already exists');

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  const newUser = new User({
    name: req.body.name,
    email: req.body.email,
    password: hashedPassword,
  });

  try {
    await newUser.save();
    res.send({ user: newUser.id });
  } catch (err) {
    res.status(400).send(err);
  }
});

// LOGIN
router.post('/login', async (req: Request, res: Response) => {
  // LETS VALIDATE BEFORE WE LOGIN A USER
  const { error } = loginValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Check if the email exists
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send('Email is not found');

  // Check password
  const validPass = await bcrypt.compare(req.body.password, user.password);
  if (!validPass) return res.status(400).send('Invalid password');

  // Create and assign a token
  const payload = { _id: user._id };
  const token = jwt.sign(payload, process.env.TOKEN_SECRET, {
    expiresIn: '1h',
  });
  res.header('auth-token', token).send(token);

  res.send('Logged in!');
});

// LOGOUT
router.post('/logout', async (req: Request, res: Response) => {
  /*
   * An implementation would probably be, to store a so-called “blacklist” of all the tokens that are valid no more
   * and have not expired yet. You can use a DB that has TTL option on documents which would be set to the amount of
   * time left until the token is expired. Redis is a good option for this, that will allow fast in memory access to
   * the list. Then, in a middleware of some kind that runs on every authorized request, you should check if provided
   * token is in The Blacklist. 🕵️‍ If it is you should throw an unauthorized error. And if it is not, let it go and
   * the JWT verification will handle it and identify if it is expired or still active.
   * https://medium.com/devgorilla/how-to-log-out-when-using-jwt-a8c7823e8a6
   */

  const newBlacklistedToken = new BlacklistedToken({
    token: req.header('auth-token'),
  });

  try {
    await newBlacklistedToken.save();
    res.send('answer');
  } catch (err) {
    res.status(400).send(err);
  }

  // Further, logout in this way should primerely happen on the frontend
  res.send(`Token added to blacklist`);
});

module.exports = router;

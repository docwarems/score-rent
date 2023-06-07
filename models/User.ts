import { Model, Schema, model} from 'mongoose';
const { isEmail } = require('validator');
import bcrypt from 'bcrypt';

// the adding of a static User Method from the JS code had to be rewritten according to
// https://mongoosejs.com/docs/typescript/statics-and-methods.html

interface IUser {
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  isVerified: boolean,
  verificationToken: String,
}

interface UserModel extends Model<IUser> {
  login(email: string, password: string): any;
}

const userSchema = new Schema<IUser, UserModel>({
  email: {
    type: String,
    required: [true, 'Bitte E-Mail angeben'],
    unique: true,
    lowercase: true,
    validate: [isEmail, 'Bitte eine gültige E-Mail-Adresse angeben']
  },
  password: {
    type: String,
    required: [true, 'Bitte Kennwort angeben'],
    minlength: [6, 'Die minimale Kennwort Länge sind 6 Zeichen'],
  },
  firstName:{
    type: String,
    required: false,
  },
  lastName:{
    type: String,
    required: [true, "Bitte Nachnamen angeben"],
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String
});
userSchema.static("login", async function login(email: string, password: string) {
  const user: any = await this.findOne({ email });
  if (user) {
    const auth = await bcrypt.compare(password, user.password);
    if (auth) {
      return user;
    }
    throw Error('incorrect password');
  }
  throw Error('incorrect email');
});

// fire a function before doc saved to db
userSchema.pre('save', async function(next: any) {
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


export const User = model<IUser, UserModel>('User', userSchema);

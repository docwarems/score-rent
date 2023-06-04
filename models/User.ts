import { Model, Schema, model} from 'mongoose';
const { isEmail } = require('validator');
import bcrypt from 'bcrypt';

// the adding of a static User Method from the JS code had to be rewritten according to
// https://mongoosejs.com/docs/typescript/statics-and-methods.html

interface IUser {
  email: string,
  password: string,
}

interface UserModel extends Model<IUser> {
  login(email: string, password: string): any;
}

const userSchema = new Schema<IUser, UserModel>({
  email: {
    type: String,
    required: [true, 'Please enter an email'],
    unique: true,
    lowercase: true,
    validate: [isEmail, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please enter a password'],
    minlength: [6, 'Minimum password length is 6 characters'],
  }
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

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// 连接到MongoDB
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mountain_sea_db');
    console.log('MongoDB连接成功');
  } catch (error) {
    console.error('MongoDB连接失败:', error);
  }
};

// 用户模型
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '请提供用户名'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [20, '用户名不能超过20个字符']
  },
  email: {
    type: String,
    required: [true, '请提供电子邮箱'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请提供有效的电子邮箱']
  },
  password: {
    type: String,
    required: [true, '请提供密码'],
    minlength: [6, '密码至少需要6个字符'],
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 密码加密
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error('密码加密失败'));
  }
});

// 获取用户模型
const User = mongoose.models.User || mongoose.model('User', userSchema);

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { username, email, password } = await request.json();
    
    // 验证输入
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: '请提供所有必填字段' },
        { status: 400 }
      );
    }
    
    // 检查用户名是否已存在
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return NextResponse.json(
        { message: '用户名已被使用' },
        { status: 400 }
      );
    }
    
    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return NextResponse.json(
        { message: '电子邮箱已被注册' },
        { status: 400 }
      );
    }
    
    // 创建新用户
    const user = await User.create({
      username,
      email,
      password
    });
    
    // 移除密码字段
    const userObj = user.toObject();
    delete userObj.password;
    
    return NextResponse.json(
      { message: '注册成功', user: userObj },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('注册错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { message: '服务器错误', error: errorMessage },
      { status: 500 }
    );
  }
}

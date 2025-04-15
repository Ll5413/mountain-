import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

// 验证密码
userSchema.methods.matchPassword = async function(enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 获取用户模型
const User = mongoose.models.User || mongoose.model('User', userSchema);

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email, password } = await request.json();
    
    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { message: '请提供电子邮箱和密码' },
        { status: 400 }
      );
    }
    
    // 查找用户并包含密码字段
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return NextResponse.json(
        { message: '无效的凭据' },
        { status: 401 }
      );
    }
    
    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return NextResponse.json(
        { message: '无效的凭据' },
        { status: 401 }
      );
    }
    
    // 创建JWT令牌
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'mountain_sea_secret',
      { expiresIn: '30d' }
    );
    
    // 设置Cookie
    const response = NextResponse.json(
      { message: '登录成功', user: { id: user._id, username: user.username, email: user.email } },
      { status: 200 }
    );
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30天
      path: '/'
    });
    
    return response;
  } catch (error: unknown) {
    console.error('登录错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { message: '服务器错误', error: errorMessage },
      { status: 500 }
    );
  }
}

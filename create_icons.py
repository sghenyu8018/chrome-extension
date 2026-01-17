#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建Chrome扩展图标
生成简单的占位图标文件
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("警告: PIL/Pillow未安装，将创建最小化的图标文件")

import os

def create_icon_with_pil(size, filename):
    """使用PIL创建图标"""
    # 创建图片（紫色渐变背景）
    img = Image.new('RGB', (size, size), color='#667eea')
    draw = ImageDraw.Draw(img)
    
    # 绘制一个简单的圆角矩形
    margin = size // 8
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=size // 6,
        fill='#764ba2'
    )
    
    # 绘制文字 "抖" 或 "🎯"
    try:
        font_size = size // 2
        # 尝试使用系统字体
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
        
        text = "抖"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        position = ((size - text_width) // 2, (size - text_height) // 2 - text_height // 4)
        draw.text(position, text, fill='white', font=font)
    except:
        # 如果字体不可用，绘制一个简单的圆形
        center = size // 2
        radius = size // 4
        draw.ellipse(
            [center - radius, center - radius, center + radius, center + radius],
            fill='white'
        )
    
    img.save(filename, 'PNG')
    print(f"已创建: {filename} ({size}x{size})")

def create_simple_icon(size, filename):
    """创建最小化的PNG文件（即使没有PIL）"""
    # 这是一个最小化的1x1像素PNG
    # 实际使用中会显示为纯色方块
    png_header = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG签名
        0x00, 0x00, 0x00, 0x0D,  # IHDR chunk大小
        0x49, 0x48, 0x44, 0x52,  # IHDR
        0x00, 0x00, 0x00, size,  # 宽度 (高位在前)
        0x00, 0x00, 0x00, size,  # 高度
        0x08, 0x06, 0x00, 0x00, 0x00,  # 位深度、颜色类型等
        0x1F, 0x15, 0xC4, 0x89,  # CRC
    ])
    
    # 由于完整的PNG编码较复杂，如果PIL不可用，先创建目录
    # 实际建议安装Pillow
    with open(filename, 'wb') as f:
        f.write(png_header)
    
    print(f"已创建占位文件: {filename} (需要Pillow生成完整图标)")

def main():
    """主函数"""
    icons_dir = 'icons'
    
    # 创建icons目录
    os.makedirs(icons_dir, exist_ok=True)
    
    sizes = [16, 48, 128]
    
    if PIL_AVAILABLE:
        print("使用PIL/Pillow创建图标...")
        for size in sizes:
            filename = os.path.join(icons_dir, f'icon{size}.png')
            create_icon_with_pil(size, filename)
        print("\n图标创建完成！")
    else:
        print("PIL/Pillow不可用，创建最小化图标...")
        print("建议安装Pillow以获得更好的图标效果:")
        print("  pip install Pillow")
        print()
        for size in sizes:
            filename = os.path.join(icons_dir, f'icon{size}.png')
            # 尝试使用更简单的方法
            try:
                # 如果有其他图像库可以使用
                create_simple_icon(size, filename)
            except:
                print(f"警告: 无法创建 {filename}，请手动创建或安装Pillow")

if __name__ == '__main__':
    main()

import { Body, Controller, Post, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from './decorator/public.decorator'; 

@ApiTags('Auth - Xác thực')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Đăng ký tài khoản mới cho khách thuê' })
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Đăng nhập lấy Token' })
  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
  
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin profile (Yêu cầu login)' })
  @Get('me')
  getProfile(@Req() req) {
    return req.user;
  }
}
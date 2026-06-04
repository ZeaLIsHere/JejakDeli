package com.medanheritage.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String toEmail, String otpCode) {
        // Cek jika masih menggunakan placeholder atau kosong
        if (mailUsername == null || mailUsername.isEmpty() || mailUsername.startsWith("your-")) {
            System.out.println("=================================================");
            System.out.println("[MOCK EMAIL] Mengirim OTP ke: " + toEmail);
            System.out.println("[MOCK EMAIL] KODE OTP ANDA: " + otpCode);
            System.out.println("=================================================");
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailUsername);
            message.setTo(toEmail);
            message.setSubject("Kode OTP Pendaftaran JejakDeli");
            message.setText("Halo!\n\n" +
                    "Terima kasih telah mendaftar di JejakDeli.\n" +
                    "Berikut adalah kode verifikasi OTP Anda:\n\n" +
                    "👉 " + otpCode + " 👈\n\n" +
                    "Kode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun.\n\n" +
                    "Salam,\nTim JejakDeli");
            mailSender.send(message);
            System.out.println("[EMAIL SUCCESS] OTP berhasil dikirim ke " + toEmail);
        } catch (Exception e) {
            System.err.println("[EMAIL ERROR] Gagal mengirim email ke " + toEmail + ". Error: " + e.getMessage());
            System.out.println("=================================================");
            System.out.println("[MOCK FALLBACK] KODE OTP ANDA: " + otpCode);
            System.out.println("=================================================");
        }
    }
}

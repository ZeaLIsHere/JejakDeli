package com.medanheritage.service;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private final EmailService emailService;
    private final Map<String, OtpData> otpCache = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public OtpService(EmailService emailService) {
        this.emailService = emailService;
    }

    public void generateAndSendOtp(String email) {
        String cleanEmail = email.trim().toLowerCase();
        
        // Generate 6 digit numeric code
        int num = 100000 + random.nextInt(900000);
        String otpCode = String.valueOf(num);

        // Expire in 5 minutes
        LocalDateTime expiryTime = LocalDateTime.now().plusMinutes(5);
        otpCache.put(cleanEmail, new OtpData(otpCode, expiryTime));

        // Send Email
        emailService.sendOtpEmail(cleanEmail, otpCode);
    }

    public boolean verifyOtp(String email, String userInputOtp) {
        if (email == null || userInputOtp == null) {
            return false;
        }

        String cleanEmail = email.trim().toLowerCase();
        OtpData storedData = otpCache.get(cleanEmail);

        if (storedData == null) {
            return false;
        }

        // Check expiration
        if (LocalDateTime.now().isAfter(storedData.expiryTime)) {
            otpCache.remove(cleanEmail); // Clean up expired OTP
            return false;
        }

        // Verify code
        boolean isValid = storedData.otpCode.equals(userInputOtp.trim());
        if (isValid) {
            otpCache.remove(cleanEmail); // Consume OTP once used successfully
        }
        return isValid;
    }

    private static class OtpData {
        final String otpCode;
        final LocalDateTime expiryTime;

        OtpData(String otpCode, LocalDateTime expiryTime) {
            this.otpCode = otpCode;
            this.expiryTime = expiryTime;
        }
    }
}

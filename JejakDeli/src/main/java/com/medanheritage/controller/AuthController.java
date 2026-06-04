package com.medanheritage.controller;

import com.medanheritage.model.Explorer;
import com.medanheritage.service.HeritageService;
import com.medanheritage.service.OtpService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final HeritageService heritageService;
    private final OtpService otpService;

    public AuthController(HeritageService heritageService, OtpService otpService) {
        this.heritageService = heritageService;
        this.otpService = otpService;
    }

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestParam String email) {
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email tidak boleh kosong."));
        }
        try {
            otpService.generateAndSendOtp(email);
            return ResponseEntity.ok(Map.of("success", true, "message", "Kode OTP telah dikirim ke email Anda. Silakan periksa inbox."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Gagal mengirim OTP: " + e.getMessage()));
        }
    }

    @PostMapping("/register-with-otp")
    public ResponseEntity<Map<String, Object>> registerWithOtp(@RequestParam String username,
                                                               @RequestParam String email,
                                                               @RequestParam String password,
                                                               @RequestParam String otp) {
        boolean isOtpValid = otpService.verifyOtp(email, otp);
        if (!isOtpValid) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Kode OTP tidak valid atau telah kedaluwarsa."));
        }
        
        Map<String, Object> result = heritageService.registerUserWithEmail(username, email, password);
        boolean success = (boolean) result.get("success");
        if (success) {
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.badRequest().body(result);
    }

    @PostMapping("/google-login")
    public ResponseEntity<Map<String, Object>> googleLogin(@RequestParam String token, HttpSession session) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + token;
            
            // Memanggil Google Token Info API untuk memverifikasi token JWT
            ResponseEntity<Map> response = restTemplate.getForEntity(verifyUrl, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                
                String email = (String) body.get("email");
                String name = (String) body.get("name");
                
                if (email != null && !email.isEmpty()) {
                     Explorer explorer = heritageService.loginOrRegisterGoogleUser(email, name);
                     if (explorer != null) {
                         session.setAttribute("currentExplorerId", explorer.getId());
                         Map<String, Object> res = new LinkedHashMap<>();
                         res.put("success", true);
                         res.put("message", "Login Google berhasil!");
                         res.put("username", explorer.getUsername());
                         res.put("isAdmin", explorer.isAdmin());
                         return ResponseEntity.ok(res);
                     }
                }
            }
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Token Google tidak valid."));
        } catch (Exception e) {
            System.err.println("[GOOGLE LOGIN ERROR] " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Terjadi kesalahan sistem saat verifikasi Google."));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestParam String username,
                                                        @RequestParam String password) {
        Map<String, Object> result = heritageService.registerUser(username, password);
        boolean success = (boolean) result.get("success");
        if (success) {
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.badRequest().body(result);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestParam String username,
                                                     @RequestParam String password,
                                                     HttpSession session) {
        Explorer explorer = heritageService.authenticateUser(username, password);
        if (explorer != null) {
            session.setAttribute("currentExplorerId", explorer.getId());
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("success", true);
            res.put("message", "Login berhasil!");
            res.put("username", explorer.getUsername());
            res.put("isAdmin", explorer.isAdmin());
            return ResponseEntity.ok(res);
        }
        return ResponseEntity.status(401).body(Map.of("success", false, "message", "Username atau password salah."));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpSession session) {
        session.removeAttribute("currentExplorerId");
        session.invalidate();
        return ResponseEntity.ok(Map.of("success", true, "message", "Berhasil logout."));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(HttpSession session) {
        Long explorerId = (Long) session.getAttribute("currentExplorerId");
        if (explorerId != null) {
            Explorer explorer = heritageService.getExplorerById(explorerId);
            if (explorer != null) {
                Map<String, Object> res = new LinkedHashMap<>();
                res.put("loggedIn", true);
                res.put("username", explorer.getUsername());
                res.put("isAdmin", explorer.isAdmin());
                res.put("email", explorer.getEmail());
                return ResponseEntity.ok(res);
            }
        }
        return ResponseEntity.ok(Map.of("loggedIn", false));
    }
}

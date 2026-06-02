package com.medanheritage.controller;

import com.medanheritage.model.Explorer;
import com.medanheritage.service.HeritageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final HeritageService heritageService;

    public AuthController(HeritageService heritageService) {
        this.heritageService = heritageService;
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

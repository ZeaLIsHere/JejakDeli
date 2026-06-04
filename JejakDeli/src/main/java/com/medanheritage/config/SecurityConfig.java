package com.medanheritage.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // Static resources and authentication endpoints should be accessible without authentication
        RequestMatcher staticResources = new OrRequestMatcher(
                new AntPathRequestMatcher("/"),
                new AntPathRequestMatcher("/index.html"),
                new AntPathRequestMatcher("/static/**"),
                new AntPathRequestMatcher("/css/**"),
                new AntPathRequestMatcher("/js/**"),
                new AntPathRequestMatcher("/favicon.ico"),
                new AntPathRequestMatcher("/h2-console/**")
        );
        RequestMatcher apiAuth = new AntPathRequestMatcher("/api/auth/**");

        http
            .csrf(csrf -> csrf.disable()) // Disable CSRF for simplicity with API calls
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(staticResources, apiAuth).permitAll()
                .anyRequest().authenticated()
            )
            .headers(headers -> headers.frameOptions(frame -> frame.disable())) // Enable H2 console
            .formLogin(Customizer.withDefaults())
            .logout(Customizer.withDefaults());
        return http.build();
    }
}

package com.example.flowable_demo.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class NotificationService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public void sendEmail(String to, String subject, String body) {
        if (!StringUtils.hasText(to)) {
            throw new IllegalArgumentException("Email recipient is required");
        }
        if (mailSender == null) {
            throw new IllegalStateException(
                    "No JavaMailSender configured; set spring.mail properties in application.properties");
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);
            mailSender.send(message);
            System.out.println("[EMAIL] sent via SMTP to=" + to + " subject=" + subject);
        } catch (MailException | MessagingException ex) {
            System.err.println("[EMAIL] SMTP send failed: " + ex.getMessage());
            throw new RuntimeException("Email send failed", ex);
        }
    }

    public void sendSms(String phone, String message) {
        System.out.println("[SMS] to=" + phone + " message=" + message);
    }
}

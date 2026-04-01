package com.example.flowable_demo.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import com.twilio.Twilio;
import com.twilio.exception.ApiException;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class NotificationService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${twilio.account-sid:}")
    private String twilioAccountSid;

    @Value("${twilio.auth-token:}")
    private String twilioAuthToken;

    @Value("${twilio.from-phone:}")
    private String twilioFromPhone;

    private volatile boolean twilioInitialized = false;

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
        if (!StringUtils.hasText(phone)) {
            throw new IllegalArgumentException("Phone number is required");
        }

        if (StringUtils.hasText(twilioAccountSid) && StringUtils.hasText(twilioAuthToken)
                && StringUtils.hasText(twilioFromPhone)) {
            try {
                if (!twilioInitialized) {
                    synchronized (this) {
                        if (!twilioInitialized) {
                            Twilio.init(twilioAccountSid, twilioAuthToken);
                            twilioInitialized = true;
                        }
                    }
                }

                Message messageResult = Message.creator(
                        new PhoneNumber(phone),
                        new PhoneNumber(twilioFromPhone),
                        message)
                        .create();

                System.out.println("[SMS] sent via Twilio to=" + phone + " sid=" + messageResult.getSid());
            } catch (ApiException ex) {
                System.err.println(
                        "[SMS] Twilio send failed: " + ex.getMessage() + " (continuing without failing process)");
                // Avoid failing the entire process if SMS provider is misconfigured
                return;
            }
            return;
        }

        System.out.println(
                "[SMS] Twilio not configured (twilio.account-sid/twilio.auth-token/twilio.from-phone missing). "
                        + "Fallback: log the message only. to=" + phone + " message=" + message);
    }
}

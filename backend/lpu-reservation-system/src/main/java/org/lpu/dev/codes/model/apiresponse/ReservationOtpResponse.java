package org.lpu.dev.codes.model.apiresponse;

public class ReservationOtpResponse {

    private boolean success;
    private String message;
    private String otpToken;

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getOtpToken() { return otpToken; }
    public void setOtpToken(String otpToken) { this.otpToken = otpToken; }
}

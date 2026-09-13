import axios from "axios";
import crypto from "crypto";
import { ServiceError } from "@/lib/errors";

class AzamPayService {
  private authBaseURL = "https://authenticator-sandbox.azampay.co.tz";
  private checkoutBaseURL: string;
  private appName: string;
  private clientId: string;
  private clientSecret: string;
  private apiKey: string;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    this.checkoutBaseURL =
      process.env.AZAMPAY_BASE_URL || "https://sandbox.azampay.co.tz";
    this.appName = process.env.AZAMPAY_APP_NAME || "";
    this.clientId = process.env.AZAMPAY_CLIENT_ID || "";
    this.clientSecret = process.env.AZAMPAY_CLIENT_SECRET || "";
    this.apiKey = process.env.AZAMPAY_API_KEY || "";
  }

  async getAccessToken(): Promise<string> {
    if (
      this.accessToken &&
      this.tokenExpiry &&
      Date.now() < this.tokenExpiry
    ) {
      return this.accessToken;
    }

    const url = `${this.authBaseURL}/AppRegistration/GenerateToken`;
    const response = await axios.post(
      url,
      {
        appName: this.appName,
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const token = response.data?.data?.accessToken;
    const expiry = response.data?.data?.expire;

    if (!token) {
      throw new Error("Access token not found in AzamPay response");
    }

    this.accessToken = token;
    this.tokenExpiry = expiry
      ? isNaN(new Date(expiry).getTime())
        ? Date.now() + 3600 * 1000
        : new Date(expiry).getTime()
      : Date.now() + 3600 * 1000;

    return token;
  }

  async initiatePayment(paymentData: {
    phoneNumber: string;
    plan: string;
    amount: number;
    reference: string;
  }): Promise<{
    success: boolean;
    reference: string;
    transactionId: string;
    message: string;
    data: Record<string, unknown>;
  }> {
    const token = await this.getAccessToken();
    const provider = this.getProviderFromPhone(paymentData.phoneNumber);

    const response = await axios.post(
      `${this.checkoutBaseURL}/azampay/mno/checkout`,
      {
        accountNumber: paymentData.phoneNumber,
        amount: paymentData.amount.toString(),
        currency: "TZS",
        // The merchant reference persisted on our side doubles as the
        // provider's externalId so webhook/status lookups always agree
        // on a single identifier. No second reference is ever generated.
        externalId: paymentData.reference,
        provider,
        additionalProperties: {
          property1: paymentData.plan,
          property2: paymentData.phoneNumber,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
        },
      }
    );

    return {
      success: response.data.success,
      reference: paymentData.reference,
      transactionId: response.data.transactionId,
      message: response.data.message,
      data: response.data,
    };
  }

  async checkPaymentStatus(
    externalReferenceId: string
  ): Promise<{ success: boolean; status: string }> {
    const token = await this.getAccessToken();
    const response = await axios.post(
      `${this.checkoutBaseURL}/statuscheck`,
      { MerchantReferenceId: externalReferenceId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
        },
      }
    );
    return response.data;
  }

  generateReference(): string {
    return `CS_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  }

  /**
   * Maps a Tanzanian MSISDN to the AzamPay provider identifier.
   * Prefixes follow the TCRA National Numbering Plan. Unknown networks
   * throw so a payment is never silently charged to the wrong provider.
   */
  getProviderFromPhone(phoneNumber: string): string {
    const number = phoneNumber.replace("+255", "").replace(/^0/, "");

    if (number.startsWith("61") || number.startsWith("62") || number.startsWith("73")) {
      return "Halotel";
    }
    if (number.startsWith("65") || number.startsWith("67") || number.startsWith("71") || number.startsWith("77")) {
      return "Tigo";
    }
    if (number.startsWith("68") || number.startsWith("69") || number.startsWith("78")) {
      return "Airtel";
    }
    if (number.startsWith("74") || number.startsWith("75") || number.startsWith("76") || number.startsWith("79")) {
      return "Mpesa";
    }

    throw new ServiceError(
      "Unable to detect a supported mobile money provider for this number.",
      400
    );
  }
}

export const azampayService = new AzamPayService();

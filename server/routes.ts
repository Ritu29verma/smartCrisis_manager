import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertEmergencyContactSchema, 
  insertAlertLogSchema, 
  insertUserSettingsSchema 
} from "@shared/schema";
import { z } from "zod";

const triggerAlertSchema = z.object({
  alertType: z.enum(["keyboard", "voice", "manual"]),
  location: z.string().optional(),
  message: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Mock user ID for demo purposes - in real app this would come from authentication
  const DEMO_USER_ID = 1;

  // Trigger emergency alert
  app.post("/api/trigger-alert", async (req, res) => {
    try {
      const { alertType, location, message } = triggerAlertSchema.parse(req.body);
      
      // Create alert log
      const alertLog = await storage.createAlertLog({
        userId: DEMO_USER_ID,
        alertType,
        status: "triggered",
        location,
        message,
      });

      // Get emergency contacts
      const contacts = await storage.getEmergencyContacts(DEMO_USER_ID);
      
      // Simulate sending alerts (in real app, integrate with Twilio/WhatsApp)
      let alertStatus = "sent";
      try {
        // Placeholder for actual alert sending logic
        console.log(`Sending emergency alert to ${contacts.length} contacts`);
        console.log("Alert details:", { alertType, location, message });
        
        // Update alert status
        await storage.createAlertLog({
          userId: DEMO_USER_ID,
          alertType,
          status: "sent",
          location,
          message: `Alert sent to ${contacts.length} emergency contacts`,
        });
      } catch (error) {
        alertStatus = "failed";
        await storage.createAlertLog({
          userId: DEMO_USER_ID,
          alertType,
          status: "failed",
          location,
          message: `Failed to send alert: ${error}`,
        });
      }

      res.json({ 
        success: true, 
        alertId: alertLog.id,
        contactsNotified: contacts.length,
        status: alertStatus
      });
    } catch (error) {
      console.error("Error triggering alert:", error);
      res.status(400).json({ error: "Failed to trigger alert" });
    }
  });

  // Get current location (placeholder - actual location comes from frontend)
  app.get("/api/location", async (req, res) => {
    res.json({
      message: "Location should be fetched from frontend using Geolocation API",
      timestamp: new Date().toISOString(),
    });
  });

  // Emergency contacts endpoints
  app.get("/api/emergency-contacts", async (req, res) => {
    try {
      const contacts = await storage.getEmergencyContacts(DEMO_USER_ID);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching emergency contacts:", error);
      res.status(500).json({ error: "Failed to fetch emergency contacts" });
    }
  });

  app.post("/api/emergency-contacts", async (req, res) => {
    try {
      const contactData = insertEmergencyContactSchema.parse({
        ...req.body,
        userId: DEMO_USER_ID,
      });
      const contact = await storage.createEmergencyContact(contactData);
      res.json(contact);
    } catch (error) {
      console.error("Error creating emergency contact:", error);
      res.status(400).json({ error: "Failed to create emergency contact" });
    }
  });

  app.put("/api/emergency-contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contactData = insertEmergencyContactSchema.partial().parse(req.body);
      const contact = await storage.updateEmergencyContact(id, contactData);
      
      if (!contact) {
        return res.status(404).json({ error: "Emergency contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      console.error("Error updating emergency contact:", error);
      res.status(400).json({ error: "Failed to update emergency contact" });
    }
  });

  app.delete("/api/emergency-contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEmergencyContact(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Emergency contact not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting emergency contact:", error);
      res.status(500).json({ error: "Failed to delete emergency contact" });
    }
  });

  // Alert logs endpoints
  app.get("/api/alert-logs", async (req, res) => {
    try {
      const logs = await storage.getAlertLogs(DEMO_USER_ID);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching alert logs:", error);
      res.status(500).json({ error: "Failed to fetch alert logs" });
    }
  });

  // User settings endpoints
  app.get("/api/user-settings", async (req, res) => {
    try {
      const settings = await storage.getUserSettings(DEMO_USER_ID);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ error: "Failed to fetch user settings" });
    }
  });

  app.put("/api/user-settings", async (req, res) => {
    try {
      const settingsData = insertUserSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateUserSettings(DEMO_USER_ID, settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(400).json({ error: "Failed to update user settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

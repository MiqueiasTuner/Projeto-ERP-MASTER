
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin
  // Note: In this environment, we usually have access to the project ID via env
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  
  if (projectId) {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: projectId,
      });
    }
  }

  const db = admin.firestore();

  // API Route for XML Feed (OLX/Zap/VivaReal)
  app.get("/api/feed.xml", async (req, res) => {
    try {
      const propertiesSnapshot = await db.collection("properties")
        .where("status", "==", "À Venda")
        .get();

      const properties = propertiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      let xml = `<?xml version="1.0" encoding="utf-8"?>
<ListingDataFeed xmlns="http://www.viva-real.com/schemas/1.0/VRSync" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.viva-real.com/schemas/1.0/VRSync http://www.viva-real.com/schemas/1.0/VRSync.xsd">
  <Header>
    <PublishDate>${new Date().toISOString()}</PublishDate>
    <DataId>SinteseERP-Feed</DataId>
  </Header>
  <Listings>`;

      properties.forEach(p => {
        xml += `
    <Listing>
      <ListingID>${p.id}</ListingID>
      <Title>${p.title || 'Imóvel'}</Title>
      <TransactionType>For Sale</TransactionType>
      <ListPrice Currency="BRL">${p.salePrice || 0}</ListPrice>
      <DetailViewUrl>${process.env.APP_URL || ''}/#/imovel/${p.id}</DetailViewUrl>
      <Media>
        ${(p.images || []).map((img: string, i: number) => `
        <Item medium="image" caption="Foto ${i + 1}">${img}</Item>`).join('')}
      </Media>
      <Details>
        <PropertyType>${p.type === 'Apartamento' ? 'Residential / Apartment' : 'Residential / Home'}</PropertyType>
        <Description>${p.description || ''}</Description>
        <LivingArea unit="square metres">${p.sizeM2 || 0}</LivingArea>
        <Bedrooms>${p.rooms || 0}</Bedrooms>
        <Bathrooms>${p.bathrooms || 0}</Bathrooms>
        <Garage>${p.garageSpaces || 0}</Garage>
        <Features>
          ${(p.features || []).map((f: string) => `
          <Feature>${f}</Feature>`).join('')}
        </Features>
        <PropertyAdministrationFee Currency="BRL">${p.monthlyCondo || 0}</PropertyAdministrationFee>
        <YearlyTax Currency="BRL">${p.monthlyIptu ? p.monthlyIptu * 12 : 0}</YearlyTax>
      </Details>
      <Location>
        <Country Abbreviation="BR">Brasil</Country>
        <State Abbreviation="SP">São Paulo</State>
        <City>${p.city || ''}</City>
        <Neighborhood>${p.neighborhood || ''}</Neighborhood>
        <Address>${p.address || ''}</Address>
        <PostalCode>${p.cep || ''}</PostalCode>
      </Location>
    </Listing>`;
      });

      xml += `
  </Listings>
</ListingDataFeed>`;

      res.header("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      console.error("Error generating feed:", error);
      res.status(500).send("Error generating feed");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

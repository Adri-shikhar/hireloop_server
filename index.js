const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

function serializeId(id) {
  return id instanceof ObjectId ? id.toString() : String(id);
}

async function findById(collection, id) {
  if (ObjectId.isValid(id)) {
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (doc) return doc;
  }
  return collection.findOne({ _id: id });
}

function stripClientId(body) {
  if (!body || typeof body !== "object") return {};
  const { _id, ...data } = body;
  return data;
}

async function run() {
  try {
    await client.connect();
    const db = client.db("Hireloop");
    const jobsCollection = db.collection("jobs");
    const companiesCollection = db.collection("companies");
    const applicationsCollection = db.collection("applications");

    app.get("/api/jobs", async (req, res) => {
      try {
        const query = {};
        if (req.query.companyId) {
          query.companyId = req.query.companyId;
        }
        if (req.query.status) {
          query.status = req.query.status;
        }
        const jobs = await jobsCollection.find(query).toArray();
        res.json(jobs.map((job) => ({ ...job, _id: serializeId(job._id) })));
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch jobs" });
      }
    });

    app.get("/api/jobs/:id", async (req, res) => {
      try {
        const job = await findById(jobsCollection, req.params.id);
        if (!job) {
          return res.status(404).json(null);
        }
        res.json({ ...job, _id: serializeId(job._id) });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch job" });
      }
    });

    app.get("/api/my-jobs", async (req, res) => {
      try {
        const query = req.query.recruiterId ? { recruiterId: req.query.recruiterId } : {};
        const jobs = await jobsCollection.find(query).toArray();
        res.json(jobs.map((job) => ({ ...job, _id: serializeId(job._id) })));
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch jobs" });
      }
    });

    app.post("/api/jobs", async (req, res) => {
      try {
        const jobData = stripClientId(req.body);
        const result = await jobsCollection.insertOne({ ...jobData, createdAt: new Date() });
        res.status(201).json({
          insertedId: serializeId(result.insertedId),
          acknowledged: result.acknowledged,
        });
      } catch (error) {
        console.error("Failed to create job:", error);
        res.status(500).json({ error: "Failed to create job entry" });
      }
    });

    app.post("/api/companies", async (req, res) => {
      try {
        const companyData = stripClientId(req.body);
        const result = await companiesCollection.insertOne(companyData);
        res.status(201).json({
          insertedId: serializeId(result.insertedId),
          acknowledged: result.acknowledged,
        });
      } catch (error) {
        console.error("Failed to create company:", error);
        res.status(500).json({ error: "Failed to create company entry" });
      }
    });

    app.get("/api/companies", async (req, res) => {
      try {
        const companies = await companiesCollection.find({}).toArray();
        res.json(companies.map((company) => ({ ...company, _id: serializeId(company._id) })));
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch companies" });
      }
    });

    app.get("/api/companies/:id", async (req, res) => {
      try {
        const company = await findById(companiesCollection, req.params.id);
        if (!company) {
          return res.status(404).json(null);
        }
        res.json({ ...company, _id: serializeId(company._id) });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch company" });
      }
    });

    app.get("/api/my-companies", async (req, res) => {
      try {
        const query = req.query.recruiterId ? { recruiterId: req.query.recruiterId } : {};
        const company = await companiesCollection.findOne(query);

        if (!company) {
          return res.status(404).json(null);
        }

        res.json({ ...company, _id: serializeId(company._id) });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch company" });
      }
    });

    app.get("/api/applications", async (req, res) => {
      try {
        const query = req.query.applicantId ? { applicantId: req.query.applicantId } : {};
        const applications = await applicationsCollection.find(query).sort({ createdAt: -1 }).toArray();
        res.json(applications.map((item) => ({ ...item, _id: serializeId(item._id) })));
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch applications" });
      }
    });

    app.post("/api/applications", async (req, res) => {
      try {
        const applicationData = stripClientId(req.body);
        const result = await applicationsCollection.insertOne({
          ...applicationData,
          status: applicationData.status || "Applied",
          createdAt: new Date(),
        });
        res.status(201).json({
          insertedId: serializeId(result.insertedId),
          acknowledged: result.acknowledged,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to create application" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

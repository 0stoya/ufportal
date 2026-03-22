import Typesense from "typesense";

function reqEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const typesenseServer = new Typesense.Client({
  nodes: [
    {
      host: reqEnv("TYPESENSE_HOST"),       // e.g. 127.0.0.1
      port: Number(reqEnv("TYPESENSE_PORT")), // 8108
      protocol: reqEnv("TYPESENSE_PROTOCOL"), // http
    },
  ],
  apiKey: reqEnv("TYPESENSE_ADMIN_KEY"),
  connectionTimeoutSeconds: 2,
});

export const TYPESENSE_COLLECTION = process.env.TYPESENSE_COLLECTION || "products";

import type { NextApiRequest, NextApiResponse } from "next";
import { format } from "@fast-csv/format";
import { GraphQLClient, gql } from "graphql-request";

export const graphqlClient = new GraphQLClient(
  "http://graphql-engine:8080/v1/graphql",
  {
    headers: {
      "x-hasura-admin-secret": "myadminsecretkey",
    },
  }
);

const getResponses = async (formID: number, cursor: number) => {
  const query = gql`
    query GetResponses($formID: Int!, $cursor: Int!, $limit: Int!) {
      responses(
        where: { form_id: { _eq: $formID }, id: { _gt: $cursor } }
        limit: $limit
        order_by: { id: asc }
      ) {
        id
        responses
      }
    }
  `;
  const variables = {
    formID,
    cursor,
    limit: PAGE_SIZE,
  };
  const data = await graphqlClient.request<{
    responses: { id: number; responses: Record<string, any> }[];
  }>(query, variables);
  return data.responses;
};

const fetchAllResponses = async function* (formID: number) {
  let cursor = 0;
  while (true) {
    const responses = await getResponses(formID, cursor);
    if (responses.length === 0) break;
    cursor = responses[responses.length - 1].id;
    yield responses;
  }
};

const PAGE_SIZE = 100;

const getForm = async (formID: number) => {
  const query = gql`
    query GetForm($formID: Int!) {
      forms_by_pk(id: $formID) {
        id
        fields
      }
    }
  `;
  const variables = {
    formID,
  };
  const data = await graphqlClient.request<{
    forms_by_pk: { id: number; fields: Record<string, any>[] };
  }>(query, variables);
  return data.forms_by_pk;
};

const fetchAllResponsesAtOnce = async (formID: number) => {
  const query = gql`
    query GetResponses($formID: Int!) {
      responses(where: { form_id: { _eq: $formID } }) {
        id
        responses
      }
    }
  `;
  const variables = {
    formID,
  };
  const data = await graphqlClient.request<{
    responses: { id: number; responses: Record<string, any> }[];
  }>(query, variables);
  return data.responses;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { form_id, stream } = req.query;
  const formID = parseInt(form_id as string);
  const form = await getForm(formID);
  const fieldsArray = Object.entries(form.fields);
  const csvStream = format({
    headers: ["id", ...fieldsArray.map(([name, field]) => field.label)],
    writeHeaders: true,
  });

  if (stream === "true") {
    console.log("streaming");
    res.setHeader(
      "Content-disposition",
      `attachment; filename=${form.id}_${new Date().toISOString()}.csv`
    );
    res.setHeader("Content-type", "text/csv");
    csvStream.pipe(res);
    for await (const responses of fetchAllResponses(formID)) {
      for (const r of responses) {
        csvStream.write([
          r.id,
          ...fieldsArray.map(([fieldName]) => r.responses[fieldName] ?? ""),
        ]);
      }
    }
  } else {
    const chunks: Buffer[] = [];
    csvStream.on("data", (chunk) => {
      chunks.push(chunk);
    });
    csvStream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader("Content-length", buffer.length);
      res.setHeader(
        "Content-disposition",
        `attachment; filename=${form.id}_${new Date().toISOString()}.csv`
      );
      res.setHeader("Content-type", "text/csv");
      res.send(buffer);
    });
    const responses = await fetchAllResponsesAtOnce(formID);
    for (const r of responses) {
      csvStream.write([
        r.id,
        ...fieldsArray.map(([fieldName]) => r.responses[fieldName] ?? ""),
      ]);
    }
  }
  csvStream.end();
}

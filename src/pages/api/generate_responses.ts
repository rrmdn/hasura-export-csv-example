import { gql } from "graphql-request";
import { faker } from "@faker-js/faker";
import type { NextApiRequest, NextApiResponse } from "next";
import { graphqlClient } from "./[form_id]/export";

// generate form and responses using faker
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const arrayFields = Array.from({ length: 10 }, () => ({
    name: faker.lorem.word(),
    type: faker.helpers.arrayElement(["text", "number", "date", "boolean"]),
  })).reduce(
    (acc, field) => {
      acc[field.name] = {
        ...field,
        // lets just capitalize first letter of field name
        label: field.name.charAt(0).toUpperCase() + field.name.slice(1),
      };
      return acc;
    },
    {} as Record<
      string,
      {
        type: string;
        label: string;
      }
    >
  );
  const inserted = await graphqlClient.request<{
    insert_forms_one: { id: number };
  }>(
    gql`
      mutation insertForm($object: forms_insert_input!) {
        insert_forms_one(object: $object) {
          id
        }
      }
    `,
    {
      object: {
        fields: arrayFields,
        name: faker.lorem.words(3),
        responses: {
          data: Array.from({ length: 3000 }, () => ({
            respondent_email: faker.internet.email(),
            responses: Object.entries(arrayFields).reduce((acc, [name, field]) => {
              acc[name] =
                field.type === "boolean"
                  ? faker.datatype.boolean()
                  : field.type === "number"
                  ? faker.number.int()
                  : field.type === "date"
                  ? faker.date.recent()
                  : faker.lorem.words(3);
              return acc;
            }, {} as Record<string, any>),
          })),
        },
      },
    }
  );
  return res.status(200).json(inserted.insert_forms_one);
}

const AWS = require('aws-sdk');
const { simpleParser } = require('mailparser');
const Iconv = require('iconv-lite');
const { config } = require('./config');

const s3 = new AWS.S3();

module.exports.inbox = async (event) => {
  if (
    event.Records &&
    event.Records[0] &&
    event.Records[0].ses &&
    event.Records[0].ses
  ) {
    try {
      const mail = event.Records[0].ses.mail;
      const receipt = event.Records[0].ses.receipt;

      if (!mail) {
        throw new Error('No mail object was provided.');
      }
      if (!receipt) {
        throw new Error('No receipt object was provided.');
      }

      console.info('Checking spam verdict...');

      const verdicts = [
        'spamVerdict',
        'virusVerdict',
        'spfVerdict',
        'dkimVerdict',
        'dmarcVerdict',
      ];

      for (let key of verdicts) {
        const verdict = receipt[key];

        if (verdict && verdict.status === 'FAIL') {
          throw new Error(
            `rejected by spam filter; ${key} = ${verdict.status}`
          );
        }
      }

      console.info('Parsing incoming email...');

      const { messageId } = mail;

      console.info(
        `Fetching email at s3://${config.bucket}/${config.keyPrefix}${messageId}`
      );

      const data = await s3
        .getObject({
          Bucket: config.bucket,
          Key: `${config.keyPrefix}${messageId}`,
        })
        .promise();

      const parsed = await simpleParser(data.Body, { Iconv });

      console.info('Parsing email...');

      const { from, to, headerLines, attachments, html, subject, date } =
        parsed;

      const { address, name } = from.value[0];

      if (
        address === 'me@nicholasgriffin.co.uk' &&
        name === 'Nicholas Griffin'
      ) {
        console.info('Processing message...');

        const processed = {};

        processed.id = messageId;
        processed.recieved = date;
        processed.to = to;
        processed.from = from;
        processed.subject = subject;
        processed.headers = headerLines;
        processed.attachments = attachments;
        processed.html = html;
        processed.subject = subject;

        const categoryFound = config.emailToCategories.find(
          (category) => category.email === to.value[0].address
        );

        let processedBucket = config.defaultCategory.bucket;
        let processedKeyPrefix = `${config.defaultCategory.keyPrefix}/${messageId}.json`;
        let response = `${config.defaultCategory.category} message processed into bucket: ${config.defaultCategory.bucket} with the key: ${config.defaultCategory.keyPrefix}${messageId}`;

        if (categoryFound) {
          processedBucket = categoryFound.bucket;
          processedKeyPrefix = `${categoryFound.keyPrefix}/${messageId}.json`;
          response = `${categoryFound.category} message processed into bucket: ${categoryFound.bucket} with the key: ${categoryFound.keyPrefix}${messageId}`;
        }

        const processedData = await s3
          .putObject({
            Bucket: processedBucket,
            Key: processedKeyPrefix,
            Body: JSON.stringify(processed),
            ContentType: 'application/json',
          })
          .promise();

        if (processedData) {
          console.info('Deleting the original email...');

          await s3
            .deleteObject({
              Bucket: config.bucket,
              Key: `${config.keyPrefix}${messageId}`,
            })
            .promise();

          console.info(response);

          return {
            statusCode: 200,
            body: JSON.stringify({
              message: response,
              event,
            }),
          };
        } else {
          throw new Error('File could not be processed.');
        }
      } else {
        throw new Error('No no no!');
      }
    } catch (error) {
      console.error(error);
      throw new Error('Internal server error');
    }
  }

  throw new Error('Incorrect event params!');
};

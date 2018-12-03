const fetch = require('node-fetch');

const getDeploys = async ({ accessToken, siteId }) => {
  return await (await fetch(
    `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
    {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    }
  )).json();
};

const getSites = async ({ accessToken }) => {
  return await (await fetch(`https://api.netlify.com/api/v1/sites/`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  })).json();
};

const triggerDeploy = async ({ accessToken, siteId }) => {
  return await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/builds`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    },
    method: 'POST'
  });
};

module.exports = {
  getDeploys,
  getSites,
  triggerDeploy
};

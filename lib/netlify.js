const fetch = require('node-fetch');

const fetchWithAuthHandling = async (...args) => {
  const response = await fetch(...args);

  if (response.status === 401) {
    throw new Error('NOT_AUTHORIZED');
  }

  return await response.json();
};

const getDeploys = async ({ accessToken, siteId }) => {
  if (siteId) {
    return await fetchWithAuthHandling(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      }
    );
  } else {
    return [];
  }
};

const getSites = async ({ accessToken }) => {
  return await fetchWithAuthHandling('https://api.netlify.com/api/v1/sites/', {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
};

const triggerDeploy = async ({ accessToken, siteId }) => {
  return await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/builds`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    },
    method: 'POST'
  });
};

const getNetlifyData = async ({ accessToken, siteId }) => {
  const [sites, deploys] = await Promise.all([
    getSites({ accessToken }),
    getDeploys({ accessToken, siteId })
  ]);

  return { sites, deploys };
};

module.exports = {
  getNetlifyData,
  triggerDeploy
};

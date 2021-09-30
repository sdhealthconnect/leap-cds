const serviceDefinitions = require("../schemas/service-definitions")

function discovery (req, res) {
    res.json({ 
        "services": serviceDefinitions
    });
}

module.exports = {
    discovery
};
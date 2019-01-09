module.exports = function(chain) {
    chain = "staging";//chain || process.env.NODE_ENV || 'production'; 
    return require(`./${chain}`);
}

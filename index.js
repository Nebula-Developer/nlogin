const fs = require('fs');
const crypto = require('crypto');

// Main constructor:
class Userbase {
    /**
     * @brief Creates a new Userbase instance
     * @param {string} rootFile The root file of the database
     */
    constructor(rootFile) {
        if (!rootFile) throw new Error('No root file specified!');

        this.rootFile = rootFile;
        if (!fs.existsSync(rootFile)) fs.writeFileSync(rootFile, '[]');

        try {
            this.data = JSON.parse(fs.readFileSync(rootFile, 'utf8'));
        } catch (e) {
            throw new Error('Invalid JSON stored in root file! (' + e + '): ' + rootFile);
        }
    }

    /**
     * @brief Gets a user from the database based on the input
     * @param {object} input The input data (look for user with inputted data)
     * @returns {object} Array of users that match the input
     */
    get(input = undefined) {
        if (!input) return this.data;

        let users = this.data.filter(user => {
            let found = true;
            Object.keys(input).forEach(key => {
                if (user[key] !== input[key]) found = false;
            });
            return found;
        });

        return users;
    }

    /**
     * @brief Adds a user to the database based on the input
     * @param {object} input The input data (add user with inputted data)
     * @returns {object} The user that was added with a token
     * @example
     * userbase.add({
     *   "username": {
     *     "value": "example",
     *     "noDuplicate": true,
     *     "rules": {
     *       "minLength": 3,
     *       "maxLength": 20,
     *       "match": "^[a-zA-Z0-9]+$",
     *       "noSpaces": true,
     *       "noSpecialCharacters": true, // !@#$%^&*()_+-=[]{}|;':",./<>?
     *       "noNumbers": false,
     *       "noLetters": false
     *     }
     *  }
     * });
     * @example
     */
    add(input) {
        if (!input) throw new Error('No input specified!');

        var exampleInput = {
            "username": {
                "value": "example",
                "noDuplicate": true,
                "rules": {
                    "minLength": 3,
                    "maxLength": 20,
                    "match": "^[a-zA-Z0-9]+$",
                    "noSpaces": true,
                    "noSpecialCharacters": true, // !@#$%^&*()_+-=[]{}|;':",./<>?
                    "noNumbers": false,
                    "noLetters": false
                }
            }
        }

        let user = {};
        var failed = null;

        Object.keys(input).forEach(key => {
            if (input[key].rules) {
                var tryCheck = checkRules(input[key].value, input[key].rules);
                if (!tryCheck.success) {
                    failed = tryCheck.message;
                    return fail(tryCheck.message);
                }
            }

            if (input[key].noDuplicate) {
                // Check if another user has the same value for this key
                let users = this.get({
                    [key]: input[key].value
                });

                if (users.length > 0) {
                    failed = 'A user with this ' + key + ' already exists!';
                    return fail('A user with this ' + key + ' already exists!');
                }
            }

            user[key] = input[key].value;
        });

        if (failed) return fail(failed);

        user.token = generateToken();
        user.id = generateID();
        this.data.push(user);
        this.save();

        return {
            success: true,
            user: user
        };
    }

    /**
     * @brief Removes a user / multiple users from the database based on the input
     * @param {object} input The input data (remove user with inputted data)
     * @returns {boolean} If the user(s) were removed
     */
    remove(input) {
        if (!input) throw new Error('No input specified!');
        
        let users = this.get(input);
        if (users.length === 0) return false;

        users.forEach(user => {
            this.data.splice(this.data.indexOf(user), 1);
        });

        this.save();
        return true;
    }

    /**
     * @brief Saves the database to the root file
     */
    save() {
        fs.writeFileSync(this.rootFile, JSON.stringify(this.data, null, 4));
    }

    /**
     * @brief Modify a user in the database
     * @param {object} find Users to modify
     * @param {object} modify Values to modify
     * @returns {boolean} If any users were modified
     * @example
     * // Replace every user with the name "example" with the name "example2"
     * userbase.modify({
     *  "username": "example"
     * }, {
     *  "username": "example2"
     * });
     * @example
     */
    modify(find, modify) {
        if (!find) throw new Error('No find input specified!');
        if (!modify) throw new Error('No modify input specified!');

        let users = this.get(find);
        if (users.length === 0) return false;

        users.forEach(user => {
            Object.keys(modify).forEach(key => {
                user[key] = modify[key];
            });
        });

        this.save();
        return true;
    }
}

function fail(message) {
    return {
        success: false,
        message: message
    };
}

function checkRules(value, rules) {
    if (rules.minLength)
        if (value.length < rules.minLength) return fail('Value must be at least ' + rules.minLength + ' characters long!');

    if (rules.maxLength)
        if (value.length > rules.maxLength) return fail('Value must be at most ' + rules.maxLength + ' characters long!');

    if (rules.match)
        if (!value.match(rules.match)) return fail('Value must match the following regex: ' + rules.match);

    if (rules.noSpaces)
        if (value.match(/\s/)) return fail('Value must not contain any spaces!');

    if (rules.noSpecialCharacters)
        if (value.match(/[^a-zA-Z0-9]/)) return fail('Value must not contain any special characters!');

    if (rules.noNumbers)
        if (value.match(/\d/)) return fail('Value must not contain any numbers!');

    if (rules.noLetters)
        if (value.match(/[a-zA-Z]/)) return fail('Value must not contain any letters!');

    return {
        success: true
    };
}

function generateToken() {
    return crypto.randomBytes(64).toString('hex');
}

function generateID() {
    return crypto.randomBytes(16).toString('hex');
}

module.exports = Userbase;

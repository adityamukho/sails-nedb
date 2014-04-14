![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# NEDB Adapter [![Build Status](https://travis-ci.org/adityamukho/sails-nedb.svg?branch=master)](https://travis-ci.org/adityamukho/sails-nedb)

Waterline adapter for NeDB.

A persistent object store which uses [Node Embedded Database](https://github.com/louischatriot/nedb) as the storage engine.

## Installation

Install from NPM.

```bash
$ npm install sails-nedb --save
```

The NeDB dependency is actually pulled from my forked repo of the original, because I needed to add aggregation support at the DB layer.

## Sails Configuration

Add the nedb config to the `config/connections.js` file.
No special configuration is necessary.

## Acknowledgement

A big thanks to the contributors of **NeDB**, **sails-disk**, and **sails-mongo**. **sails-nedb** owes it in no small amount to each of these projects for its existence :).

## About Sails.js
http://sailsjs.com

## About Waterline
Waterline is a new kind of storage and retrieval engine.  It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs.  That means you write the same code to get users, whether they live in mySQL, LDAP, MongoDB, or Facebook.

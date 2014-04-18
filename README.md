![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# NeDB Adapter [![Build Status](https://travis-ci.org/adityamukho/sails-nedb.svg?branch=master)](https://travis-ci.org/adityamukho/sails-nedb) [![NPM version](https://badge.fury.io/js/sails-nedb.png)](http://badge.fury.io/js/sails-nedb)

[![Npm Downloads](https://nodei.co/npm/sails-nedb.png?downloads=true&stars=true)](https://nodei.co/npm/sails-nedb.png?downloads=true&stars=true)

Waterline adapter for NeDB.

A persistent object store which uses [Node Embedded Database](https://github.com/louischatriot/nedb) as the storage engine.

## Caution

In case you run multiple sails workers on a machine as part of a load balancing strategy: NeDB is not designed to synchronize file writes across multiple concurrent processes. Running an NeDB-backed sails app with more than 1 worker **WILL** eventually lead to inconsistent, and very likely corrupted data.

## Installation

Install from NPM.

```bash
$ npm install sails-nedb --save
```

The NeDB dependency is actually pulled from my forked repo of the original, because I needed to add aggregation support at the DB layer. If and when [this pull request](https://github.com/louischatriot/nedb/pull/153) gets merged into the main line, the dependendency will be switched back to the npm module.

## Sails Configuration

Add the nedb config to the `config/connections.js` file.
No special configuration is necessary. One can optionally set the `filePath` to point to a particular location. Files get saved to `.tmp` inside the application root by default.

## Acknowledgement

A big thanks to the contributors of **NeDB**, **sails-disk**, and **sails-mongo**. This adapter owes its existence in no small amount to each of these projects :).

## About Sails.js
http://sailsjs.com

## About Waterline
Waterline is a new kind of storage and retrieval engine.  It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs.  That means you write the same code to get users, whether they live in mySQL, LDAP, MongoDB, or Facebook.

import json
import os
from datetime import datetime
import bcrypt

class JSONDatabase:
    def __init__(self, data_dir=None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), "data")
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        
    def _get_file_path(self, collection_name):
        return os.path.join(self.data_dir, f"{collection_name}.json")
    
    def _load_collection(self, collection_name):
        file_path = self._get_file_path(collection_name)
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                return json.load(f)
        return []
    
    def _save_collection(self, collection_name, data):
        file_path = self._get_file_path(collection_name)
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def get_collection(self, collection_name):
        return self._load_collection(collection_name)
    
    def insert_many(self, collection_name, documents):
        collection = self._load_collection(collection_name)
        collection.extend(documents)
        self._save_collection(collection_name, collection)
        return len(documents)
    
    def insert_one(self, collection_name, document):
        collection = self._load_collection(collection_name)
        collection.append(document)
        self._save_collection(collection_name, collection)
        return document
    
    def delete_many(self, collection_name, query={}):
        collection = self._load_collection(collection_name)
        if query:
            # Simple query support for exact matches
            filtered = [doc for doc in collection if not all(doc.get(k) == v for k, v in query.items())]
        else:
            filtered = []
        count = len(collection) - len(filtered)
        self._save_collection(collection_name, filtered)
        return count
    
    def find(self, collection_name, query={}, limit=0):
        collection = self._load_collection(collection_name)
        if query:
            # Simple query support for exact matches
            results = [doc for doc in collection if all(doc.get(k) == v for k, v in query.items())]
        else:
            results = collection
        return results[:limit] if limit else results
    
    def find_one(self, collection_name, query={}):
        results = self.find(collection_name, query, limit=1)
        return results[0] if results else None

    def update_one(self, collection_name, query, update):
        collection = self._load_collection(collection_name)
        updated = False

        for idx, doc in enumerate(collection):
            if all(doc.get(k) == v for k, v in query.items()):
                if "$set" in update and isinstance(update["$set"], dict):
                    collection[idx].update(update["$set"])
                else:
                    collection[idx].update(update)
                updated = True
                break

        if updated:
            self._save_collection(collection_name, collection)
        return updated

db = JSONDatabase()

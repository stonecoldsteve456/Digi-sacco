import React from "react";
import { FiSearch } from "react-icons/fi";

function SearchBar({ onSearch }) {
  const handleChange = (event) => {
    onSearch(event.target.value);
  };

  return (
    <div className="search-bar">
      <FiSearch className="search-icon" />
      <input
        type="text"
        placeholder="Search deposits..."
        onChange={handleChange}
      />
    </div>
  );
}

export default SearchBar;

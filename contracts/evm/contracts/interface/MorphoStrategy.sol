// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./YieldStrategy.sol";

/**
 * @title MorphoStrategy Interface
 * @notice Interface for Morpho-specific yield strategy with reward claiming
 */
interface MorphoStrategy is YieldStrategy {
    /**
     * @dev Claim rewards from Morpho URD for a user
     * @param user Address of the user claiming rewards
     * @param claimable Total claimable amount (from off-chain data)
     * @param proof Merkle proof for claiming from Morpho URD
     * @return Amount of rewards claimed
     */
    function claimRewards(
        address user,
        uint256 claimable,
        bytes32[] calldata proof
    ) external returns (uint256);
}

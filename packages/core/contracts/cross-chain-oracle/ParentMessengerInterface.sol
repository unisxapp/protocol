// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

interface ParentMessengerInterface {
    // Should send cross-chain message to Child messenger contract or revert.
    function sendMessageToChild(bytes memory data) external;

    // Should be targeted by ChildMessenger and executed upon receiving a message from child chain.
    function processMessageFromChild(bytes memory data) external;
}

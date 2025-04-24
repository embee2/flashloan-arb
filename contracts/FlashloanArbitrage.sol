// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

// Aave V3 simple flash‐loan receiver interface
import "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanSimpleReceiver.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";

// Uniswap‐style router
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
// ERC20
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FlashloanArbitrage is IFlashLoanSimpleReceiver {
    address public owner;

    // These two public state vars automatically satisfy the
    // IFlashLoanSimpleReceiver interface’s getters
    IPoolAddressesProvider public override ADDRESSES_PROVIDER;
    IPool                   public override POOL;

    IUniswapV2Router02 public routerA;
    IUniswapV2Router02 public routerB;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        address provider_,    // e.g. Aave PoolAddressesProvider on Polygon
        address routerA_,
        address routerB_
    ) {
        owner = msg.sender;
        ADDRESSES_PROVIDER = IPoolAddressesProvider(provider_);
        POOL = IPool(ADDRESSES_PROVIDER.getPool());
        routerA = IUniswapV2Router02(routerA_);
        routerB = IUniswapV2Router02(routerB_);
    }

    /// @notice Kick off a flash‐loan
    function executeFlashloan(
        address asset,
        uint256 amount,
        address[] calldata pathA,
        address[] calldata pathB
    ) external onlyOwner {
        bytes memory data = abi.encode(pathA, pathB);
        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            data,
            0 // referralCode
        );
    }

    /// @dev Aave V3 callback
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address,          // initiator
        bytes calldata data
    ) external override returns (bool) {
        // decode swap paths
        (address[] memory pathA, address[] memory pathB) =
            abi.decode(data, (address[], address[]));

        uint256 totalOwing = amount + premium;

        // 1) asset→intermediate on routerA
        IERC20(asset).approve(address(routerA), amount);
        routerA.swapExactTokensForTokens(
            amount,
            1,
            pathA,
            address(this),
            block.timestamp
        );

        // 2) intermediate→asset on routerB
        address intermediate = pathA[pathA.length - 1];
        uint256 bal = IERC20(intermediate).balanceOf(address(this));
        IERC20(intermediate).approve(address(routerB), bal);
        routerB.swapExactTokensForTokens(
            bal,
            totalOwing,
            pathB,
            address(this),
            block.timestamp
        );

        // 3) repay the pool
        IERC20(asset).approve(address(POOL), totalOwing);
        return true;
    }

    /// @notice Pull out any leftover tokens (profits)
    function withdraw(address token) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        require(bal > 0, "Nothing to withdraw");
        IERC20(token).transfer(owner, bal);
    }

    receive() external payable {}
}

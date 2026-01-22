#!/usr/bin/env python3
"""
Data Migration Script for Unified Auth System

Migrates existing data to the admin user's data directory:
- /data/workspace/* → /data/users/{admin-id}/workspace/
- /data/analyst-projects/* → /data/users/{admin-id}/analyst/
- /data/video-factory/* → /data/users/{admin-id}/video-factory/

Run this script once after deploying the auth system.
"""

import asyncio
import shutil
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models.models import User
from app.core.config import settings


# Data directories
OLD_WORKSPACE_DIR = Path("/data/workspace")
OLD_ANALYST_DIR = Path("/data/analyst-projects")
OLD_VIDEO_FACTORY_DIR = Path("/data/video-factory")
USER_DATA_BASE_DIR = Path(settings.USER_DATA_BASE_DIR)

ADMIN_EMAIL = "ace.tech.gg@gmail.com"


async def get_admin_user(session: AsyncSession) -> User | None:
    """Get the admin user from the database."""
    result = await session.execute(
        select(User).where(User.email == ADMIN_EMAIL)
    )
    return result.scalars().first()


def migrate_directory(src: Path, dst: Path, dry_run: bool = False) -> int:
    """
    Migrate contents from source to destination directory.
    Returns the number of items migrated.
    """
    if not src.exists():
        print(f"  Source does not exist: {src}")
        return 0

    items = list(src.iterdir())
    if not items:
        print(f"  Source is empty: {src}")
        return 0

    # Create destination if needed
    if not dry_run:
        dst.mkdir(parents=True, exist_ok=True)

    migrated = 0
    for item in items:
        dest_item = dst / item.name

        if dest_item.exists():
            print(f"  SKIP (exists): {item.name}")
            continue

        if dry_run:
            print(f"  WOULD MOVE: {item.name}")
        else:
            try:
                if item.is_dir():
                    shutil.copytree(item, dest_item)
                else:
                    shutil.copy2(item, dest_item)
                print(f"  MIGRATED: {item.name}")
                migrated += 1
            except Exception as e:
                print(f"  ERROR migrating {item.name}: {e}")

    return migrated


async def main(dry_run: bool = False):
    """Main migration function."""
    print("=" * 60)
    print("Data Migration Script for Unified Auth System")
    print(f"Started at: {datetime.now().isoformat()}")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE MIGRATION'}")
    print("=" * 60)

    # Connect to database
    db_url = settings.DATABASE_URL
    # Handle both sqlite:/// and sqlite+aiosqlite:/// formats
    if "sqlite:///" in db_url and "+aiosqlite" not in db_url:
        db_url = db_url.replace("sqlite:///", "sqlite+aiosqlite:///")
    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Get admin user
        admin = await get_admin_user(session)
        if not admin:
            print(f"\nERROR: Admin user not found ({ADMIN_EMAIL})")
            print("Please start the API server first to create the admin user.")
            return

        print(f"\nAdmin user found: {admin.name} ({admin.email})")
        print(f"Admin ID: {admin.id}")

        # Determine admin data directory
        admin_data_dir = USER_DATA_BASE_DIR / str(admin.id)
        print(f"Target directory: {admin_data_dir}")

        # Create base directories if needed
        if not dry_run:
            admin_data_dir.mkdir(parents=True, exist_ok=True)
            for subdir in ["workspace", "analyst", "video-factory", "ccresearch"]:
                (admin_data_dir / subdir).mkdir(exist_ok=True)

        print("\n" + "-" * 40)
        print("Migrating Workspace data...")
        print("-" * 40)
        workspace_count = migrate_directory(
            OLD_WORKSPACE_DIR,
            admin_data_dir / "workspace",
            dry_run=dry_run
        )

        print("\n" + "-" * 40)
        print("Migrating Analyst data...")
        print("-" * 40)
        analyst_count = migrate_directory(
            OLD_ANALYST_DIR,
            admin_data_dir / "analyst",
            dry_run=dry_run
        )

        print("\n" + "-" * 40)
        print("Migrating Video Factory data...")
        print("-" * 40)
        video_count = migrate_directory(
            OLD_VIDEO_FACTORY_DIR,
            admin_data_dir / "video-factory",
            dry_run=dry_run
        )

        # Summary
        print("\n" + "=" * 60)
        print("Migration Summary")
        print("=" * 60)
        print(f"Workspace items migrated: {workspace_count}")
        print(f"Analyst items migrated: {analyst_count}")
        print(f"Video Factory items migrated: {video_count}")
        print(f"Total items migrated: {workspace_count + analyst_count + video_count}")

        if dry_run:
            print("\nThis was a DRY RUN. No files were moved.")
            print("Run without --dry-run to perform the actual migration.")
        else:
            print("\nMigration complete!")
            print("\nNote: Original data has been COPIED (not moved) to preserve backups.")
            print("You can manually delete the old directories once verified:")
            print(f"  rm -rf {OLD_WORKSPACE_DIR}")
            print(f"  rm -rf {OLD_ANALYST_DIR}")
            print(f"  rm -rf {OLD_VIDEO_FACTORY_DIR}")

    await engine.dispose()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Migrate user data to unified auth system")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be migrated without making changes"
    )
    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run))
